import React, { Fragment, useEffect, useState } from 'react';
import { Badge, Button, Card, Divider, message, Popconfirm, Spin, Table } from 'antd';
import { ColumnProps, PaginationConfig, SorterResult } from 'antd/lib/table';
import { DeviceInstance } from '@/pages/device/instance/data';
import moment from 'moment';
import { router } from 'umi';
import encodeQueryParam from '@/utils/encodeParam';
import apis from '@/services';
import Bind from '@/pages/device/gateway/bind';
import Save from '@/pages/device/instance/Save';

interface Props {
  deviceId: string;
  loading: boolean;
}

interface State {
  data: any;
  searchParam: any;
  currentItem: any;
  spinning:boolean;
  bindVisible:boolean;
  addVisible:boolean;
}

const Gateway: React.FC<Props> = (props) => {

  const initState: State = {
    data: {},
    searchParam: { pageSize: 10 },
    currentItem: {},
    spinning:false,
    bindVisible:false,
    addVisible:false,
  };

  const [searchParam, setSearchParam] = useState(initState.searchParam);
  const [data, setData] = useState(initState.data);
  const [spinning, setSpinning] = useState(initState.spinning);
  const [currentItem, setCurrentItem] = useState(initState.currentItem);
  const [addVisible, setAddVisible] = useState(initState.addVisible);
  const [bindVisible, setBindVisible] = useState(initState.bindVisible);

  const handleSearch = (params?: any) => {
    setSearchParam(params);
    apis.deviceInstance.list(encodeQueryParam(params))
      .then((response:any) => {
        if (response.status === 200) {
          setData(response.result)
        } else {
          message.error("查询错误")
        }
      }
    ).catch(()=>{});

  };

  useEffect(() => {
    handleSearch({
      pageSize: 10,
      terms: {
        parentId: props.deviceId,
      },
    })
  }, []);

  const changeDeploy = (record: any) => {
    apis.deviceInstance
      .changeDeploy(record.id)
      .then(response => {
        if (response.status === 200) {
          message.success('操作成功');
          handleSearch(searchParam);
        }
      })
      .catch(() => {});
  };

  const unDeploy = (record: any) => {
    apis.deviceInstance
      .unDeploy(record.id)
      .then(response => {
        if (response.status === 200) {
          message.success('操作成功');
          handleSearch(searchParam);
        }
      })
      .catch(() => {});
  };

  const statusMap = new Map();
  statusMap.set('在线', 'success');
  statusMap.set('离线', 'error');
  statusMap.set('未激活', 'processing');

  const columns: ColumnProps<DeviceInstance>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: '设备名称',
      dataIndex: 'name',
    },
    {
      title: '设备型号',
      dataIndex: 'productName',
    },
    {
      title: '注册时间',
      dataIndex: 'registryTime',
      width: '200px',
      render: (text: any) => moment(text).format('YYYY-MM-DD HH:mm:ss'),
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'state',
      render: record =>
        record ? <Badge status={statusMap.get(record.text)} text={record.text} /> : '',
    },
    {
      title: '操作',
      width: '200px',
      align: 'center',
      render: (record: any) => (
        <Fragment>
          <a
            onClick={() => {
              router.push(`/device/instance/save/${record.id}`);
            }}
          >
            查看
          </a>
          <Divider type="vertical" />
          <a
            onClick={() => {
              setCurrentItem(record);
              setAddVisible(true);
            }}
          >
            编辑
          </a>
          <Divider type="vertical" />
          {record.state?.value === 'notActive' ? (
              <Popconfirm
                title="确认激活？"
                onConfirm={() => {
                  changeDeploy(record);
                }}
              >
                <a>激活</a>
              </Popconfirm>
          ) : (
            <Popconfirm
              title="确认注销设备？"
              onConfirm={() => {
                unDeploy(record);
              }}
            >
              <a>注销</a>
            </Popconfirm>
          )}

          <Divider type="vertical" />
          <Popconfirm
            title="确认解绑？"
            onConfirm={() => {
              unBindGateway(props.deviceId,record.id);
            }}
          >
            <a>解绑</a>
          </Popconfirm>
        </Fragment>
      ),
    },
  ];

  const onTableChange = (
    pagination: PaginationConfig,
    filters: any,
    sorter: SorterResult<DeviceInstance>,
  ) => {
    handleSearch({
      pageIndex: Number(pagination.current) - 1,
      pageSize: pagination.pageSize,
      terms: searchParam.terms,
      sorts: sorter,
    });
  };

  const unBindGateway = (id: string, deviceId: string) => {
    setSpinning(true);
    apis.deviceGateway.unBind(id, deviceId)
      .then(response => {
        if (response.status === 200) {
          message.success('解绑成功');
          handleSearch(searchParam);
        }
        setSpinning(false);
      }).catch(() => {
    });
  };

  const saveDeviceInstance = (item: any) => {
    apis.deviceInstance.saveOrUpdate(item)
      .then((response:any) => {
        if (response.status === 200) {
          message.success('保存成功');
          setAddVisible(false);
          router.push(`/device/instance/save/${item.id}`);
        }
      }).catch();
  };

  const insert = (data:any) => {
    setSpinning(true);
    apis.deviceGateway.bind(props.deviceId, data).then(response => {
      if (response.status === 200) {
        message.success('保存成功');
        setBindVisible(false);
        handleSearch(searchParam);
      }
      setSpinning(false);
    }).catch(() => {
    });
  };

  const action = (
    <Button type="primary" icon="plus" onClick={() => setBindVisible(true)}>
      绑定子设备
    </Button>
  );

  return (
    <div>
      <Spin spinning={spinning}>
        <Card style={{ marginBottom: 20 }} title="功能调试" extra={action}>
          <Table
            loading={props.loading}
            columns={columns}
            dataSource={data?.data}
            rowKey="id"
            onChange={onTableChange}
            pagination={{
              current: data.pageIndex + 1,
              total: data.total,
              pageSize: data.pageSize,
              showQuickJumper: true,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total: number) =>
                `共 ${total} 条记录 第  ${data.pageIndex + 1}/${Math.ceil(
                  data.total / data.pageSize,
                )}页`,
            }}
          />
        </Card>
        {addVisible && (
          <Save
            data={currentItem}
            close={() => {
              setAddVisible(false);
              setCurrentItem({});
            }}
            save={(item: any) => {
              saveDeviceInstance(item);
            }}
          />
        )}

        {bindVisible && (
          <Bind
            close={() => {
              setBindVisible(false);
              setCurrentItem({});
            }}
            save={(item: any) => {
              insert(item);
            }}
            data={currentItem}
          />
        )}
      </Spin>
    </div>
  );
};

export default Gateway;
